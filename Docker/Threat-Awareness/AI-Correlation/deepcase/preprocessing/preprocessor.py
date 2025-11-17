import numpy  as np
import pandas as pd
import torch
from tqdm import tqdm
import pdb

class Preprocessor(object):
    """Preprocessor for loading data from standard data formats."""

    def __init__(self, length, timeout, NO_EVENT=-1337):
        """Preprocessor for loading data from standard data formats.

            Parameters
            ----------
            length : int
                Number of events in context.

            timeout : float
                Maximum time between context event and the actual event in
                seconds.0

            NO_EVENT : int, default=-1337
                ID of NO_EVENT event, i.e., event returned for context when no
                event was present. This happens in case of timeout or if an
                event simply does not have enough preceding context events.
            """
        # Set context length
        self.context_length = length
        self.timeout        = timeout

        # Set no-event event
        self.NO_EVENT = NO_EVENT

        # Set required columns
        self.REQUIRED_COLUMNS = {'timestamp', 'event', 'machine'}


    ########################################################################
    #                      General data preprocessing                      #
    ########################################################################

    def read_csv_files(self, *args):
        # read multiple files, args are the path of the files

        frame_list = []
        for i in range(len(args)):
            data_temp = pd.read_csv(args[i],sep=',')
            # data_temp = data_temp.drop_duplicates(subset=['time','ip','short'])  # delete dupulated events for same stimestamp and ip # TF: have done before start. 
            # #data_temp = data_temp.reset_index(drop=True)
            frame_list.append(data_temp)

        data = pd.concat(frame_list)
        # data = data.reset_index(drop=True) # comment it to save old index (TF)

        return data 

    
    
    def text(self, *args):
    #def text(self, path,nrows=None,labels=None, verbose=False):
        """Preprocess data from text file.
           Returns:
           events: torch.Tensor of shape(n_samples, )
           context:torch.Tensor of shape(n_samples, context_length)
           labels_events: the predicted events, because it is a LM, the labels acutally is the following event
           mapping: dict()
           """
        #events = list()
        #machines = list()
        # data_list =[]
        # for i in range(len(args)):
        #     data_temp = pd.read_csv(args[i], sep=',')
        #     data_list.append(data_temp)
        # data = pd.concat(data_list)

        #data = pd.read_csv(path,sep=',')
        data = self.read_csv_files(*args)
        data = data.rename(columns = {"time":"timestamp","ip":"machine","short":"event","time_label":"label"})


        # Remove not useful event casusing most false positive. Accroding to paper "Introducint a new alert data set for multi-step attack analysis"
        # mask_Cav = data["event"] == 'W-Sys-Cav'
        # data = data[~mask_Cav]
        # mask_Dov = data["event"] == 'W-Sys-Dov'
        # data = data[~mask_Dov]
        #data = data.reset_index(drop=True) # Must reset the index
        
        return self.sequence(data,labels=None,verbose=False)

    def sequence(self, data, labels=None, verbose=False):
        """Transform pandas DataFrame into DeepCASE sequences.

            Parameters
            ----------
            data : pd.DataFrame
                Dataframe to preprocess.

            labels : int or array-like of shape=(n_samples,), optional
                If a int is given, label all sequences with given int. If an
                array-like is given, use the given labels for the data in file.
                Note: will overwrite any 'label' data in input file.

            verbose : boolean, default=False
                If True, prints progress in transforming input to sequences.

            Returns
            -------
            context : torch.Tensor of shape=(n_samples, context_length)
                Context events for each event in events.

            events : torch.Tensor of shape=(n_samples,)
                Events in data.

            labels_events: the predicted events, because it is a LM, the labels acutally is the following event
                torch.Tensor of shape=(n_samples,)
                Labels will be None if no labels parameter is given, and if data
                does not contain any 'labels' column.
            
            labels_binary: malicious or not

            mapping : dict()
                Mapping from new event_id to original event_id.
                Sequencing will map all events to a range from 0 to n_events.
                This is because event IDs may have large values, which is
                difficult for a one-hot encoding to deal with. Therefore, we map
                all Event ID values to a new value in that range and provide
                this mapping to translate back.
            """
        ################################################################
        #                  Transformations and checks                  #
        ################################################################

        # # Case where a single label is given
        # if isinstance(labels, int):
        #     # Set given label to all labels
        #     labels = np.full(data.shape[0], labels, dtype=int)

        # # Transform labels to numpy array
        # labels = np.asarray(labels)

        # # Check if data contains required columns
        # if set(data.columns) & self.REQUIRED_COLUMNS != self.REQUIRED_COLUMNS:
        #     raise ValueError(
        #         ".csv file must contain columns: {}"
        #         .format(list(sorted(self.REQUIRED_COLUMNS)))
        #     )

        # # Check if labels is same shape as data
        # if labels.ndim and labels.shape[0] != data.shape[0]:
        #     raise ValueError(
        #         "Number of labels: '{}' does not correspond with number of "
        #         "samples: '{}'".format(labels.shape[0], data.shape[0])
        #     )

        ################################################################
        #                          Map events                          #
        ################################################################

        # Create mapping of events
        mapping = {
            i: event for i, event in enumerate(np.unique(data['event'].values))
        }

        # Check that NO_EVENT is not in events
        if self.NO_EVENT in mapping.values():
            raise ValueError(
                "NO_EVENT ('{}') is also a valid Event ID".format(self.NO_EVENT)
            )

        mapping[len(mapping)] = self.NO_EVENT
        mapping_inverse = {v: k for k, v in mapping.items()}

        # Apply mapping   # TF: explain: data['event'] the value transfer from the name of one event to the index of distinct event name. 
        data['event'] = data['event'].map(mapping_inverse)
        
        # This label is attack type. Not used in our task because we implement N-gram, which predict the following event
        # labels_binary is used
        mapping_label = {i: label for i, label in enumerate(np.unique(data['label'].values))}
        mapping_label_inverse = {v:k for k,v in mapping_label.items()}
        # TF: explain: data['label'] the value transfer from the name of one attack type to the index of distinct attack type name. 
        data['label'] = data['label'].map(mapping_label_inverse)
        #print(mapping_label_inverse)
        labels = torch.Tensor(data['label'].values).to(torch.long)
        #pdb.set_trace()
        index_false_positive = mapping_label_inverse['false_positive']
        labels_binary = [0 if i==index_false_positive else 1 for i in labels ] # benign or malicious
        labels_binary = np.array(labels_binary)


        # Check if labels is same shape as data
        if labels.shape[0] != data.shape[0]:
            raise ValueError((
                "Number of labels: '{}' does not correspond with number of"
                "samples:'{}'".format(labels.shape[0],data.shape[0])
            ))



        ################################################################
        #                      Initialise results                      #
        ################################################################

        # Set events as events
        events = torch.Tensor(data['event'].values).to(torch.long)

        # Set context full of NO_EVENTs
        context = torch.full(
            size       = (data.shape[0], self.context_length),
            fill_value = mapping_inverse[self.NO_EVENT],
        ).to(torch.long)

        # Set labels if given
        # if labels.ndim:
        #     labels = torch.Tensor(labels).to(torch.long)
        # # Set labels if contained in data
        # elif 'label' in data.columns:
        #     labels = torch.Tensor(data['label'].values).to(torch.long)
        # # Otherwise set labels to None
        # else:
        #     labels = None

        ################################################################
        #                        Create context                        #
        ################################################################

        # Sort data by timestamp
        data = data.sort_values(by='timestamp') # sort_values() not effect on the index, the old index doesn't change. (TF)

        # Group by machines
        machine_grouped = data.groupby('machine')
        # Add verbosity
        if verbose: machine_grouped = tqdm(machine_grouped, desc='Loading')

        # Group by machine
        for machine, events_ in machine_grouped:
            # Get indices, timestamps and events
            indices    = events_.index.values  # follow old index (TF)
            timestamps = events_['timestamp'].values
            events_    = events_['event'].values

            # Initialise context for single machine
            machine_context = np.full(
                (events_.shape[0], self.context_length),
                mapping_inverse[self.NO_EVENT],
                dtype = int,
            )

            # Loop over all parts of the context
            for i in range(self.context_length):

                # Compute time difference between context and event
                time_diff = timestamps[i+1:] - timestamps[:-i-1]
                # Check if time difference is larger than threshold
                timeout_mask = time_diff > self.timeout

                # Set mask to NO_EVENT
                machine_context[i+1:, self.context_length-i-1] = np.where(
                    timeout_mask,
                    mapping_inverse[self.NO_EVENT],
                    events_[:-i-1],
                )
                machine_context[i+1:,self.context_length-i-1] = events_[:-i-1]

            #pdb.set_trace()
            # Convert to torch Tensor
            machine_context = torch.Tensor(machine_context).to(torch.long)
            # Add machine_context to context
            context[indices] = machine_context

            # arrange labels
        # labels_events = context[1:,-1]
        # context = context[:-1,:]
        # labels_binary = labels_binary[1:]

        ################################################################
        #                        Return results                        #
        ################################################################

        # Return result
        #return context, events, labels_events, mapping,mapping_label,labels_binary
        return context, events,  mapping,mapping_label,labels_binary


    ########################################################################
    #                     Preprocess different formats                     #
    ########################################################################

    def csv(self, path, nrows=None, labels=None, verbose=False):
        """Preprocess data from csv file.

            Note
            ----
            **Format**: The assumed format of a .csv file is that the first line
            of the file contains the headers, which should include
            ``timestamp``, ``machine``, ``event`` (and *optionally* ``label``).
            The remaining lines of the .csv file will be interpreted as data.

            Parameters
            ----------
            path : string
                Path to input file from which to read data.

            nrows : int, default=None
                If given, limit the number of rows to read to nrows.

            labels : int or array-like of shape=(n_samples,), optional
                If a int is given, label all sequences with given int. If an
                array-like is given, use the given labels for the data in file.
                Note: will overwrite any 'label' data in input file.

            verbose : boolean, default=False
                If True, prints progress in transforming input to sequences.

            Returns
            -------
            events : torch.Tensor of shape=(n_samples,)
                Events in data.

            context : torch.Tensor of shape=(n_samples, context_length)
                Context events for each event in events.

            labels : torch.Tensor of shape=(n_samples,)
                Labels will be None if no labels parameter is given, and if data
                does not contain any 'labels' column.

            mapping : dict()
                Mapping from new event_id to original event_id.
                Sequencing will map all events to a range from 0 to n_events.
                This is because event IDs may have large values, which is
                difficult for a one-hot encoding to deal with. Therefore, we map
                all Event ID values to a new value in that range and provide
                this mapping to translate back.
            """
        # Read data from csv file into pandas dataframe
        data = pd.read_csv(path, nrows=nrows)

        # Transform to sequences and return
        return self.sequence(data, labels=labels, verbose=verbose)


    def json(self, path, labels=None, verbose=False):
        """Preprocess data from json file.

            Note
            ----
            json preprocessing will become available in a future version.

            Parameters
            ----------
            path : string
                Path to input file from which to read data.

            labels : int or array-like of shape=(n_samples,), optional
                If a int is given, label all sequences with given int. If an
                array-like is given, use the given labels for the data in file.
                Note: will overwrite any 'label' data in input file.

            verbose : boolean, default=False
                If True, prints progress in transforming input to sequences.

            Returns
            -------
            events : torch.Tensor of shape=(n_samples,)
                Events in data.

            context : torch.Tensor of shape=(n_samples, context_length)
                Context events for each event in events.

            labels : torch.Tensor of shape=(n_samples,)
                Labels will be None if no labels parameter is given, and if data
                does not contain any 'labels' column.

            mapping : dict()
                Mapping from new event_id to original event_id.
                Sequencing will map all events to a range from 0 to n_events.
                This is because event IDs may have large values, which is
                difficult for a one-hot encoding to deal with. Therefore, we map
                all Event ID values to a new value in that range and provide
                this mapping to translate back.
            """
        raise NotImplementedError("Parsing '.json' not yet implemented.")


    def ndjson(self, path, labels=None, verbose=False):
        """Preprocess data from ndjson file.

            Note
            ----
            ndjson preprocessing will become available in a future version.

            Parameters
            ----------
            path : string
                Path to input file from which to read data.

            labels : int or array-like of shape=(n_samples,), optional
                If a int is given, label all sequences with given int. If an
                array-like is given, use the given labels for the data in file.
                Note: will overwrite any 'label' data in input file.

            verbose : boolean, default=False
                If True, prints progress in transforming input to sequences.

            Returns
            -------
            events : torch.Tensor of shape=(n_samples,)
                Events in data.

            context : torch.Tensor of shape=(n_samples, context_length)
                Context events for each event in events.

            labels : torch.Tensor of shape=(n_samples,)
                Labels will be None if no labels parameter is given, and if data
                does not contain any 'labels' column.

            mapping : dict()
                Mapping from new event_id to original event_id.
                Sequencing will map all events to a range from 0 to n_events.
                This is because event IDs may have large values, which is
                difficult for a one-hot encoding to deal with. Therefore, we map
                all Event ID values to a new value in that range and provide
                this mapping to translate back.
            """
        raise NotImplementedError("Parsing '.ndjson' not yet implemented.")




if __name__ == "__main__":
    ########################################################################
    #                               Imports                                #
    ########################################################################

    import argformat
    import argparse
    import os

    ########################################################################
    #                           Parse arguments                            #
    ########################################################################

    # Create Argument parser
    parser = argparse.ArgumentParser(
        description     = "Preprocessor: processes data from standard formats into DeepCASE sequences.",
        formatter_class = argformat.StructuredFormatter
    )

    # Add arguments
    parser.add_argument('file',                                  help='file      to preprocess')
    parser.add_argument('--write',                               help='file      to write output')
    parser.add_argument('--type',              default='auto'  , help="file type to preprocess (auto|csv|json|ndjson|t(e)xt)")
    parser.add_argument('--context', type=int, default=10      , help="size of context")
    parser.add_argument('--timeout', type=int, default=60*60*24, help="maximum time between context and event")

    # Parse arguments
    args = parser.parse_args()

    ########################################################################
    #                              Parse type                              #
    ########################################################################

    # Allowed extensions
    ALLOWED_EXTENSIONS = {'csv', 'json', 'ndjson', 'txt', 'text'}

    # Infer type
    if args.type == 'auto':
        # Get file by extension
        args.type = os.path.splitext(args.file)[1][1:]
        # Check if recovered extension is allowed
        if args.type not in ALLOWED_EXTENSIONS:
            raise ValueError(
                "Automatically parsed extension not supported: '.{}'. "
                "Please manually specify --type (csv|json|ndjson|t(e)xt)"
                .format(args.type)
            )

    ########################################################################
    #                              Preprocess                              #
    ########################################################################

    # Create preprocessor
    preprocessor = Preprocessor(
        context = args.context,
        timeout = args.timeout,
    )

    # Preprocess file
    if args.type == 'csv':
        events, context, labels = preprocessor.csv(args.file)
    elif args.type == 'json':
        events, context, labels = preprocessor.json(args.file)
    elif args.type == 'ndjson':
        events, context, labels = preprocessor.ndjson(args.file)
    elif args.type == 'txt' or args.type == 'text':
        events, context, labels = preprocessor.text(args.file)
    else:
        raise ValueError("Unsupported file type: '{}'".format(args.type))

    ########################################################################
    #                             Write output                             #
    ########################################################################

    # Write output if necessary
    if args.write:

        # Open output file
        with open(args.write, 'wb') as outfile:
            # Write output
            torch.save({
                'events' : events,
                'context': context,
                'labels' : labels,
            }, outfile)

        ####################################################################
        #                           Load output                            #
        ####################################################################

        # Open output file
        with open(args.write, 'rb') as infile:
            # Load output
            data = torch.load(infile)
            # Load variables
            events  = data.get('events')
            context = data.get('context')
            labels  = data.get('labels')

    ########################################################################
    #                             Show output                              #
    ########################################################################

    print("Events : {}".format(events))
    print("Context: {}".format(context))
    print("Labels : {}".format(labels))
